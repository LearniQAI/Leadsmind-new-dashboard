import { emailData } from '@/data/apps/email-data';
import Image from 'next/image';
import React from 'react';

const EmailInboxTable = () => {
    return (
        <>
            {emailData.map((email, index) => (
                <div className="media" key={index}>
                    <div className="media-size-email">
                        <label className="block mb-0">
                            <input className="checkbox_animated" type="checkbox" />
                        </label>
                        <i className={`fa-${email.star ? "solid" : "regular"} fa-star`}></i>
                        <Image
                            className="w-5 me-[16px] border-circle"
                            priority
                            src={email.avatar}
                            alt={`Avatar of ${email.name}`}
                        />
                    </div>
                    <div className="media-body">
                        <h6>{email.name}</h6>
                        <p>{email.description}</p>
                        <span>{email.time}</span>
                    </div>
                </div>
            ))}
        </>
    );
};

export default EmailInboxTable;
