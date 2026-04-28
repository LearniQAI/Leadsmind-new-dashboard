import React from 'react';

interface TLabelProps {
    label: string;
    id: string;
    optional?:boolean;
    className?:string;
}

const FormLabel = ({ label, id, optional }: TLabelProps) => {
    return (
        <>
            <div className="form__input-title">
                <label htmlFor={id}>{label} {optional ? "" : <><span>*</span></>}</label>
            </div>
        </>
    );
};

export default FormLabel;