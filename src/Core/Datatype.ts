export default interface Datatype {
    value: string;
    text: string;
    isValid?(value: any): boolean;
    preprocess?(value: string): string;
}

export const NumericalDatatype = {
    value: 'numerical',
    text: 'Numerical',
    isValid: (value: any) => {
        if (typeof value === 'number') {
            return !isNaN(value) && isFinite(value);
          }
          if (typeof value === 'string') {
            return !isNaN(Number(value.trim()));
          }
          return false;
    },
    preprocess: (value: any) => {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            return value.trim();
        }
        return false;
    }
}

export const TextDatatype = {
    value: 'text',
    text: "Text",
    preprocess: (value: string) => {
        return value.trim();
    }
}

export const datatypes = [NumericalDatatype, TextDatatype]

export function getDatatype(type: string) {
    return datatypes.find(datatype => datatype.value === type) as Datatype;
}