'use client';
import React, { useState } from 'react';
import { Button, Menu, MenuItem, TextField } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const ActionButtonWithDropdown = () => {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [anchorElTwo, setAnchorElTwo] = useState<HTMLButtonElement | null>(null);
    const [anchorElThree, setAnchorElThree] = useState<HTMLButtonElement | null>(null);

    const handleOpenMenu = (
        event: React.MouseEvent<HTMLButtonElement>,
        setAnchor: React.Dispatch<React.SetStateAction<HTMLButtonElement | null>>
    ) => {
        setAnchor(event.currentTarget);
    };

    const handleCloseMenu = (
        setAnchor: React.Dispatch<React.SetStateAction<HTMLButtonElement | null>>
    ) => {
        setAnchor(null);
    };

    return (
        <div className="card__wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Action Button With Dropdown</h5>
            </div>

            {/* First Dropdown */}
            <div className="from__input-box">
                <div className="input-group">
                    <input type="text" className="form-control" aria-label="Text input with dropdown button" />
                    <Button variant="outlined">Action</Button>
                    <Button
                        variant="outlined"
                        endIcon={<KeyboardArrowDownIcon />}
                        onClick={(e) => handleOpenMenu(e, setAnchorEl)}
                    >
                    </Button>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => handleCloseMenu(setAnchorEl)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        disableScrollLock // Directly pass the property
                        sx={{
                            overflowY: 'auto',
                        }}
                    >
                        <MenuItem onClick={() => handleCloseMenu(setAnchorEl)}>Action</MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorEl)}>More Action</MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorEl)}>Another Action</MenuItem>
                    </Menu>

                </div>
            </div>

            {/* Second Dropdown */}
            <div className="from__input-box">
                <div className="input-group">
                    <Button variant="outlined">Action</Button>
                    <Button
                        variant="outlined"
                        endIcon={<KeyboardArrowDownIcon />}
                        onClick={(e) => handleOpenMenu(e, setAnchorElTwo)}
                    >
                    </Button>
                    <Menu
                        anchorEl={anchorElTwo}
                        open={Boolean(anchorElTwo)}
                        onClose={() => handleCloseMenu(setAnchorElTwo)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        disableScrollLock // Directly pass the property
                        sx={{
                            overflowY: 'auto',
                        }}
                    >
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElTwo)}>Action</MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElTwo)}>More Action</MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElTwo)}>Another Action</MenuItem>
                    </Menu>
                    <input type="text" className="form-control" aria-label="Text input with dropdown button" />
                </div>
            </div>

            {/* Third Dropdown */}
            <div className="from__input-box">
                <div className="input-group">
                    <Button variant="outlined">Action</Button>
                    <input type="text" className="form-control" aria-label="Text input with dropdown button" />
                    <Button
                        variant="outlined"
                        endIcon={<KeyboardArrowDownIcon />}
                        onClick={(e) => handleOpenMenu(e, setAnchorElThree)}
                    >
                    </Button>
                    <Menu
                        anchorEl={anchorElThree}
                        open={Boolean(anchorElThree)}
                        onClose={() => handleCloseMenu(setAnchorElThree)}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        disableScrollLock // Directly pass the property
                        sx={{
                            overflowY: 'auto',
                        }}
                    >
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElThree)}>Action</MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElThree)}>More Action</MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElThree)}>Another Action</MenuItem>
                        <MenuItem disabled>
                            <hr className="dropdown-divider" />
                        </MenuItem>
                        <MenuItem onClick={() => handleCloseMenu(setAnchorElThree)}>Separated link</MenuItem>
                    </Menu>
                </div>
            </div>
        </div>
    );
};

export default ActionButtonWithDropdown;
