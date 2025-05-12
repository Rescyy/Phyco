export default interface Datatype {
    value: string;
    text: string;
    isReadonly?: boolean;
    isValid?(value: any): boolean;
    preprocess?(value: string): string;
}

export type DatatypePayload = {
    value: string;
    text: string;
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

export const FormulaDatatype = {
    value: 'formula',
    text: "Formula",
    isReadonly: true,
}

export const datatypes = [NumericalDatatype, TextDatatype, FormulaDatatype]

export function getDatatype(type: string) {
    return datatypes.find(datatype => datatype.value === type) as Datatype;
}