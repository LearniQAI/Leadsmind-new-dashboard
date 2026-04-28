import React from 'react';

type ErrorMessageProps = {
    error: any;
};

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
    const getErrorMessage = (error: any): string | null => {
        if (error && typeof error.message === "string") {
            return error.message;
        }
        return null;
    };

    return error ? <p className="error-message">{getErrorMessage(error)}</p> : null;
};

export default ErrorMessage;
