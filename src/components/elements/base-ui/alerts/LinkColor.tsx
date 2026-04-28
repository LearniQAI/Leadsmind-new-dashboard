import Link from 'next/link';
import React from 'react';

const LinkColor = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Link Color</h5>
                </div>
                <div className="alert-wrapper">
                    <div className="alert alert-primary">
                        <p>This is a primary alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-secondary">
                        <p>This is a secondary alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-success">
                        <p>This is a success alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-info">
                        <p>This is an info alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-warning">
                        <p>This is a warning alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-danger">
                        <p>This is a danger alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-light">
                        <p>This is a light alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                    <div className="alert alert-dark">
                        <p>This is a dark alert with <Link className="alert-link" href="#" >an example
                            link</Link>. Click it.</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LinkColor;