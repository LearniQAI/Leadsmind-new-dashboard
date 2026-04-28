"use client";
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import MuiAccordion from '@mui/material/Accordion';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import MuiAccordionDetails from '@mui/material/AccordionDetails';
import ArrowForwardIosSharpIcon from '@mui/icons-material/ArrowForwardIosSharp';
import { Typography } from '@mui/material';

const FaqMainArea = () => {
    const [expanded, setExpanded] = React.useState<string | false>('panel1');

    const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
        setExpanded(newExpanded ? panel : false);
    };
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Faq' subTitle='Home' />
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="according__wrapper form__accordion">
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>01.</span>What is the Manez HRM & CRM Dashboard?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                The Manez HRM & CRM Dashboard is an advanced integrated platform
                                                designed to streamline the management of human resources and customer
                                                relationships for businesses. It provides comprehensive tools for
                                                employee management, recruitment, payroll processing, tracking customer
                                                interactions, managing sales pipelines, and much more, all in one
                                                cohesive system.

                                                <ul>
                                                    <li>Employee Management: Efficiently handle employee data, track attendance, manage roles, and ensure smooth communication within the organization.</li>
                                                    <li>Recruitment: Simplify the hiring process with features that help post job openings, manage applications, and track candidate progress through various hiring stages.</li>
                                                    <li>Payroll Processing: Automate payroll calculations, manage employee benefits, deductions, and generate accurate payslips to ensure timely and correct salary disbursements.</li>
                                                </ul>
                                                The Manez HRM & CRM Dashboard is designed to improve efficiency, enhance
                                                productivity, and provide a holistic view of both employee and customer
                                                data, enabling businesses to make data-driven decisions and foster
                                                growth.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>02.</span>How do I access the Manez HRM & CRM Dashboard?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                You can access the dashboard by logging in with your credentials on the
                                                provided URL. Ensure you have the necessary permissions granted by your
                                                administrator.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>03.</span>Who can use the Manez HRM & CRM Dashboard?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                The dashboard is designed for HR professionals, managers, sales teams,
                                                and customer service representatives. Access levels and functionalities
                                                are determined by your role and permissions set by your organization.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel4'} onChange={handleChange('panel4')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>04.</span>How do I add a new employee?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                To add a new employee, navigate to the {`'Employee Management'`} section,
                                                click on {`'Add Employee'`}, and fill in the required details such as name,
                                                position, department, and contact information. Employee leave requests
                                                can be managed under the {`'Leave Management'`} tab. You can approve,
                                                reject, or modify leave requests, and view the leave balances for each
                                                employee.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel5'} onChange={handleChange('panel5')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>05.</span>How do I add a new customer?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                To add a new customer, go to the {`'Customer Management'`} section, click on
                                                {`'Add Customer'`}, and enter the
                                                {`customer's`} details, including name, contact information, and company
                                                details.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel6'} onChange={handleChange('panel6')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>06.</span>What should I do if I forget my password?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                If you forget your password, click on the {`'Forgot Password'`} link on the
                                                login page. Follow the instructions to reset your password via email.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel7'} onChange={handleChange('panel7')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>07.</span>How can I customize the dashboard?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                The dashboard can be customized under the {`'Settings'`} section. You can
                                                modify the layout, add or remove widgets, and configure notifications
                                                according to your preferences. User permissions can be set in the
                                                {` 'User Management'`} section. Administrators can assign roles and permissions to
                                                different users based on their responsibilities.
                                                <p className="mt-[20px] mb-0">Yes, the dashboard supports integration with
                                                    various third-party tools such as email clients, calendars, and
                                                    accounting software. Check the {`'Integrations'`} section for available
                                                    options and setup instructions.</p>
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                                <div className="accordion-item">
                                    <MuiAccordion expanded={expanded === 'panel8'} onChange={handleChange('panel8')}>
                                        <MuiAccordionSummary
                                            expandIcon={<ArrowForwardIosSharpIcon fontSize="small" />}
                                            aria-controls="panel1d-content"
                                            id="panel1d-header"
                                        >
                                            <Typography className='accordion-header'><span>08.</span>How secure is the Manez HRM & CRM Dashboard?</Typography>
                                        </MuiAccordionSummary>
                                        <MuiAccordionDetails>
                                            <div className="accordion-body">
                                                Our dashboard employs advanced security measures including encryption,
                                                two-factor authentication, and regular security audits to ensure your
                                                data is safe and secure.
                                                Two-factor authentication can be enabled in the {`'Security Settings'`}
                                                under the {`'Settings'`} section. Follow the instructions to set up and
                                                enable this feature for added security.
                                            </div>

                                        </MuiAccordionDetails>
                                    </MuiAccordion>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default FaqMainArea;