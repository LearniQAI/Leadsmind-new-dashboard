"use client";

import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import { LinearProgress, Box, Typography } from '@mui/material';

const ProgressMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle="Progress Bar" subTitle="Ui Elements" />
                <div className="grid grid-cols-12">
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Basic Progress Bar</h5>
                            </div>
                            <div className="mz-progress-bar progress-showcase">
                                {/* Default Progress */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Default Progress (50%)
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={50}
                                        className="progress-bar progress-default"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>

                                {/* Progress with 25% */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Progress 25%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={25}
                                        className="progress-bar progress-primary"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>

                                {/* Progress with 50% */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Progress 50%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={50}
                                        className="progress-bar progress-secondary"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>

                                {/* Progress with 75% */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Progress 75%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={75}
                                        className="progress-bar progress-success"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>

                                {/* Progress with 100% */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Progress 100%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={100}
                                        className="progress-bar bg-info"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>

                                {/* Warning Progress with 100% */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Warning Progress 100%
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={100}
                                        className="progress-bar progress-warning"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>

                                {/* Indeterminate Progress */}
                                <Box sx={{ width: '100%', mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Indeterminate Progress
                                    </Typography>
                                    <LinearProgress
                                        variant="indeterminate"
                                        className="progress-bar"
                                        sx={{ height: '10px' }}
                                    />
                                </Box>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default ProgressMainArea;






