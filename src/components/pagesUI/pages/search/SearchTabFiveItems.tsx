import React from 'react';

const SearchTabFiveItems = () => {
    return (
        <>
            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                <div className="col-span-12 lg:col-span-6">
                    <div className="card__wrapper">
                        <div className="ratio ratio-21x9">
                            <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 lg:col-span-6">
                    <div className="card__wrapper">
                        <div className="ratio ratio-21x9">
                            <iframe src="https://www.youtube.com/embed/vn9B2hH4G_E?si=O9HLXWP6BBTJADIl"></iframe>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 lg:col-span-6">
                    <div className="card__wrapper no-height">
                        <div className="ratio ratio-16x9">
                            <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
                        </div>
                    </div>
                </div>
                <div className="col-span-12 lg:col-span-6">
                    <div className="card__wrapper">
                        <div className="ratio ratio-4x3">
                            <iframe src="https://www.youtube.com/embed/vn9B2hH4G_E?si=O9HLXWP6BBTJADIl"></iframe>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center">
                <button type="button" className="btn btn-primary">Load
                    More</button>
            </div>
        </>
    );
};

export default SearchTabFiveItems;