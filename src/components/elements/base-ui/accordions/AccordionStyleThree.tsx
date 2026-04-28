
"use client";
import * as React from 'react';
import MuiAccordion from '@mui/material/Accordion';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';

const AccordionStyleThree = () => {
    const [expanded, setExpanded] = React.useState<string | false>('panel1');

    const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
        setExpanded(newExpanded ? panel : false);
    };
    return (
        <>
             <div className="card__wrapper accordion-wrapper">
            <div className="card__title-wrap mb-[20px]">
                <h5 className="card__heading-title">Accordions Style 03</h5>
            </div>
            <div className='accordion-body accordion-primary'>
            <MuiAccordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
                <MuiAccordionSummary
                    expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                    aria-controls="panel1d-content"
                    id="panel1d-header"
                >
                   <Typography className='accordion-header'>Accordion Item #1</Typography>
                </MuiAccordionSummary>
                <MuiAccordionDetails>
                    <div className="accordion-body">
                        <strong>This is the first {`item's`} accordion body.</strong> It is shown by
                        default, until the collapse plugin adds the appropriate classes that we
                        use
                        to
                        style each element. These classes control the overall appearance, as
                        well as
                        the
                        showing and hiding via CSS transitions. You can modify any of this with
                        custom
                        CSS or overriding our default variables. {`It's`} also worth noting that
                        just
                        about
                        any HTML can go within the <code>.accordion-body</code>, though the
                        transition
                        does limit overflow.
                    </div>
                </MuiAccordionDetails>
            </MuiAccordion>
            <MuiAccordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
                <MuiAccordionSummary
                    expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                    aria-controls="panel2d-content"
                    id="panel2d-header"
                >
                    <Typography className='accordion-header'>Accordion Item #2</Typography>
                </MuiAccordionSummary>
                <MuiAccordionDetails>
                    <div className="accordion-body">
                        <strong>This is the first {`item's`} accordion body.</strong> It is shown by
                        default, until the collapse plugin adds the appropriate classes that we
                        use
                        to
                        style each element. These classes control the overall appearance, as
                        well as
                        the
                        showing and hiding via CSS transitions. You can modify any of this with
                        custom
                        CSS or overriding our default variables. {`It's`} also worth noting that
                        just
                        about
                        any HTML can go within the <code>.accordion-body</code>, though the
                        transition
                        does limit overflow.
                    </div>
                </MuiAccordionDetails>
            </MuiAccordion>
            <MuiAccordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
                <MuiAccordionSummary
                    expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                    aria-controls="panel3d-content"
                    id="panel3d-header"
                >
                    <Typography className='accordion-header'>Accordion Item #3</Typography>
                </MuiAccordionSummary>
                <MuiAccordionDetails>
                    <div className="accordion-body">
                        <strong>This is the first {`item's`} accordion body.</strong> It is shown by
                        default, until the collapse plugin adds the appropriate classes that we
                        use
                        to
                        style each element. These classes control the overall appearance, as
                        well as
                        the
                        showing and hiding via CSS transitions. You can modify any of this with
                        custom
                        CSS or overriding our default variables. {`It's`} also worth noting that
                        just
                        about
                        any HTML can go within the <code>.accordion-body</code>, though the
                        transition
                        does limit overflow.
                    </div>
                </MuiAccordionDetails>
            </MuiAccordion>
            </div>
        </div>
        </>
    );
};

export default AccordionStyleThree;