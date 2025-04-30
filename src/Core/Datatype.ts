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
        return (typeof value === 'string' || typeof value === 'number') && !isNaN(Number(value));
    },
    preprocess: (value: any) => {
        return value.toString().trim();
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