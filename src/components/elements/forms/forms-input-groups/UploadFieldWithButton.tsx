import React from 'react';

const UploadFieldWithButton = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Upload Field with Button</h5>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <label className="input-group-text" htmlFor="inputGroupFile1">Upload</label>
                            <input type="file" className="form-control" id="inputGroupFile1"/>
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <input type="file" className="form-control" id="inputGroupFile2"/>
                                <label className="input-group-text" htmlFor="inputGroupFile2">Upload</label>
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <button className="btn btn-outline-primary" type="button" id="inputGroupFile3">Button</button>
                            <input type="file" className="form-control" id="inputGroupFile3" aria-describedby="inputGroupFile3" aria-label="Upload"/>
                        </div>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input">
                        <div className="input-group">
                            <input type="file" className="form-control" id="inputGroupFile4" aria-describedby="inputGroupFile4" aria-label="Upload"/>
                                <button className="btn btn-outline-primary" type="button" id="inputGroupFile4">Button</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UploadFieldWithButton;