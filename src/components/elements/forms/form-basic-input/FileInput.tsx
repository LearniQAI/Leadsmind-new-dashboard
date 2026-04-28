import React from 'react';

const FileInput = () => {
    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">File Input</h5>
                </div>
                <div>
                    <div className="from__input-box from-grid">
                        <div className="form__input-title">
                            <label htmlFor="File">file<span>*</span></label>
                        </div>
                        <div className="form__input">
                            <input className="form-control" name="name" id="File" type="File" />
                        </div>
                    </div>
                    <div className="from__input-box from-grid">
                        <div className="form__input-title">
                            <label htmlFor="formFileMultiple" className="form-label">Multiple files input
                                example</label>
                        </div>
                        <div className="form__input">
                            <input className="form-control" type="file" id="formFileMultiple" />
                        </div>
                    </div>

                    <div className="from__input-box from-grid">
                        <div className="form__input-title">
                            <label htmlFor="formFileDisabled" className="form-label">Disabled file input
                                example</label>
                        </div>
                        <div className="form__input">
                            <input className="form-control" type="file" id="formFileDisabled" disabled/>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FileInput;