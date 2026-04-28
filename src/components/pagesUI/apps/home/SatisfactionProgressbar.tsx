import { Box, LinearProgress } from '@mui/material';
import React from 'react';

const SatisfactionProgressbar = () => {
    return (
        <>
            <div className="mz-progress-bar style-2">
                <div className="mz-progress">
                    <div className="mz-progress-head">
                        <h4 className="mz-progress-title">Excellent<span>/5 Star</span></h4>
                        <span className="mz-progress-percentage">44%</span>
                    </div>
                    <Box sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress variant="determinate" value={44} className="progress-bar progress-primary" sx={{ height: '10px' }} />
                    </Box>
                    <div className="mz-progress-head">
                        <h4 className="mz-progress-title">Very Good<span>/4 Star</span></h4>
                        <span className="mz-progress-percentage">22%</span>
                    </div>
                    <Box sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress variant="determinate" value={22} className="progress-bar progress-secondary" sx={{ height: '10px' }} />
                    </Box>
                    <div className="mz-progress-head">
                        <h4 className="mz-progress-title">Good<span>/3 Star</span></h4>
                        <span className="mz-progress-percentage">18%</span>
                    </div>
                    <Box sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress variant="determinate" value={18} className="progress-bar progress-success" sx={{ height: '10px' }} />
                    </Box>
                    <div className="mz-progress-head">
                        <h4 className="mz-progress-title">Poor<span>/2 Star</span></h4>
                        <span className="mz-progress-percentage">7%</span>
                    </div>
                    <Box sx={{ width: '100%', mb: 2 }}>
                        <LinearProgress variant="determinate" value={7} className="progress-bar progress-warning" sx={{ height: '10px' }} />
                    </Box>
                    <div className="mz-progress-head">
                        <h4 className="mz-progress-title">Very Poor<span>/1 Star</span></h4>
                        <span className="mz-progress-percentage">4%</span>
                    </div>
                    <Box sx={{ width: '100%' }}>
                        <LinearProgress variant="determinate" value={4} className="progress-bar progress-info" sx={{ height: '10px' }} />
                    </Box>
                </div>
            </div>
        </>
    );
};

export default SatisfactionProgressbar;