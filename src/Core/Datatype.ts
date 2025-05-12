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

export const NumericalDatatype: Datatype = {
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
    preprocess: (value: string) => {
        return value.trim();
    }
}

export const TextDatatype: Datatype = {
    value: 'text',
    text: "Text",
    preprocess: (value: string) => {
        return value.trim();
    }
}

export const FormulaDatatype: Datatype = {
    value: 'formula',
    text: "Formula",
    isReadonly: true,
}

export const primitiveDatatypes = [NumericalDatatype, TextDatatype];
export const allDatatypes = [...primitiveDatatypes, FormulaDatatype]

export function getDatatype(type: string) {
    return allDatatypes.find(datatype => datatype.value === type) as Datatype;
}