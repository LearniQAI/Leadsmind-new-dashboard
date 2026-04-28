import React from 'react';
import Radio from '@mui/material/Radio';
import FormControl from '@mui/material/FormControl';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';

// Define the possible radio values
interface BpRadioProps {
  value: any;
  [key: string]: any;
}

export const BpRadio: React.FC<BpRadioProps> = ({ value, ...rest }) => {
  return (
    <Radio
      disableRipple
      color="default"
      checkedIcon={<span className="bp-icon bp-icon-checked" />}
      icon={<span className="bp-icon" />}
      value={value}
      {...rest}
    />
  );
};

const CustomRadioGroup: React.FC = () => {
  return (
    <div className='radio-input-style'>
      <FormControl>
        <RadioGroup defaultValue="primary" aria-labelledby="demo-customized-radios" name="customized-radios">
          <FormControlLabel className='radio-primary' control={<BpRadio value="primary" />} label="Primary" />
          <FormControlLabel className='radio-secondary' control={<BpRadio value="secondary" />} label="Secondary" />
          <FormControlLabel className='radio-success' control={<BpRadio value="success" />} label="Success" />
          <FormControlLabel className='radio-danger' control={<BpRadio value="danger" />} label="Danger" />
          <FormControlLabel className='radio-warning' control={<BpRadio value="warning" />} label="Warning" />
          <FormControlLabel className='radio-info' control={<BpRadio value="info" />} label="Info" />
          <FormControlLabel className='radio-dark' control={<BpRadio value="dark" />} label="Dark" />
        </RadioGroup>
      </FormControl>
    </div>
  );
};

export default CustomRadioGroup;
