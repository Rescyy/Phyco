use anyhow::anyhow;
use serde::Serialize;
use std::error::Error;
use std::fs::File;
use std::io::Write;
use std::iter::zip;

use csv::Reader;
use serde_json::{Map, Value};

pub fn save_project(content: String, filename: String) -> tauri::Result<()> {
    File::create(filename)
        .and_then(|mut file| file.write_all(content.as_bytes()))
        .map_err(|e| tauri::Error::Io(e))
}

#[derive(Serialize, Debug)]
struct ColumnModel {
    name: String,
    r#type: String,
}

#[derive(Serialize, Debug)]
pub struct OpenProjectModel {
    columns: Vec<ColumnModel>,
    rows: Vec<Map<String, Value>>,
}

pub fn read_project(filename: String) -> tauri::Result<OpenProjectModel> {
    let mut csv = read_csv(filename.as_str())
        .map_err(|_| tauri::Error::Anyhow(anyhow!["Failed reading the csv file"]))?
        .into_iter();
    let names = csv
        .next()
        .ok_or(tauri::Error::Anyhow(anyhow!["Expected column names"]))?;
    let types = csv
        .next()
        .ok_or(tauri::Error::Anyhow(anyhow!["Expected column types"]))?;
    let columns = zip(names.clone(), types)
        .map(|(name, r#type)| ColumnModel { name: name, r#type })
        .collect();
    let rows: Vec<Map<String, Value>> = csv
        .map(|row| {
            zip(&names, row)
                .map(|(name, value)| (name.clone(), Value::from(value)))
                .collect()
        })
        .collect();
    Ok(OpenProjectModel {
        columns,
        rows: rows,
    })
}

fn read_csv(path: &str) -> Result<Vec<Vec<String>>, Box<dyn Error>> {
    let file = File::open(path)?;
    let mut rdr = Reader::from_reader(file);
    let mut data = Vec::new();

    let columns = rdr.headers()?;
    data.push(columns.into_iter().map(|s| s.to_string()).collect());

    for result in rdr.records() {
        let record = result?;
        data.push(record.into_iter().map(|s| s.to_string()).collect());
    }

    Ok(data)
}
