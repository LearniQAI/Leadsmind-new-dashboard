"use client"
import React, { useEffect } from 'react';
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import { initializeDropzone } from '@/lib/utils/dropzoneUtils';

const DropzoneMainArea: React.FC = () => {
    useEffect(() => {
        // Initialize single file Dropzone with maxFiles = 1
        const singleDropzone = initializeDropzone('singleFileUpload', 1);
        // Initialize multi-file Dropzone with maxFiles = 10
        const multiDropzone = initializeDropzone('multiFileUpload', 10);

        return () => {
            if (singleDropzone) {
                singleDropzone.destroy();
            }
            if (multiDropzone) {
                multiDropzone.destroy();
            }
        };
    }, []);
    return (
        <div className="app__slide-wrapper">
            <Breadcrumb breadTitle="Dropzone" subTitle="Ui Elements" />
            <div className="grid grid-cols-12">
                <div className="col-span-12">
                    <div className="card__wrapper dropzone-wrapper dropzone-border">
                        <div className="card__title-wrap mb-[20px]">
                            <h5 className="card__heading-title">Single File Upload</h5>
                        </div>
                        <div className="dropzone dz-clickable" id="singleFileUpload">
                            <div className="dz-default dz-message">
                                <i className="fa-thin fa-cloud-arrow-up"></i>
                                <h6>Drop files here or click to upload.</h6>
                                <span className="note needsclick">
                                    (This is just a demo dropzone. Files are not actually uploaded.)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-span-12">
                    <div className="card__wrapper dropzone-wrapper dropzone-border">
                        <div className="card__title-wrap mb-[20px]">
                            <h5 className="card__heading-title">Multi File Upload</h5>
                        </div>
                        <div className="dropzone dz-clickable" id="multiFileUpload">
                            <div className="dz-default dz-message">
                                <i className="fa-thin fa-cloud-arrow-up"></i>
                                <h6>Drop files here or click to upload.</h6>
                                <span className="note needsclick">
                                    (This is just a demo dropzone. Files are not actually uploaded.)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DropzoneMainArea;
