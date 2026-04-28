'use client'
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { FormControl, IconButton, InputAdornment, OutlinedInput } from '@mui/material';
import React, { useState } from 'react';

const Default = () => {
    //form password field
    const [showPassword, setShowPassword] = useState(false);
    const handleClickShowPassword = () => setShowPassword((show: any) => !show);
    const handleMouseDownPassword = (event: any) => {
        event.preventDefault();
    };
    const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
      };
    //form password field


    return (
        <>
            <div className="card__wrapper form__element-xs">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Default</h5>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <span className="input-group-text" id="basic-field1">@</span>
                        <input type="text" className="form-control" placeholder="Username" aria-label="Username" aria-describedby="basic-field1" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="form__input input-password">
                        <FormControl sx={{ m: 1, width: '25ch' }} variant="outlined">
                            <OutlinedInput
                                id="outlined-adornment-password"
                                type={showPassword ? 'text' : 'password'}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={handleClickShowPassword}
                                            onMouseDown={handleMouseDownPassword}
                                            onMouseUp={handleMouseUpPassword}
                                            edge="end"
                                        >
                                            {showPassword ? <Visibility /> : <VisibilityOff />}
                                        </IconButton>
                                    </InputAdornment>
                                }
                                label="Password"
                            />
                        </FormControl>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <input type="text" className="form-control" placeholder="User Name With Site Name" aria-label="your username" aria-describedby="username-with-link" />
                        <span className="input-group-text" id="username-with-link">@manez.com</span>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group form__element-xs">
                        <span className="input-group-text" id="username-with-site-link">https://manez.com/users/</span>
                        <input type="text" className="form-control" placeholder="User Name With Site Address" id="username-with-site-link" aria-describedby="username-with-site-link" />
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input type="number" className="form-control" placeholder="Total Amount" aria-label="Amount" />
                        <span className="input-group-text">0.00</span>
                    </div>
                </div>
                <div className="from__input-box">
                    <div className="input-group form__element-xs">
                        <span className="input-group-text">Textarea</span>
                        <textarea className="form-control" aria-label="With textarea" placeholder="Your Message"></textarea>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Default;