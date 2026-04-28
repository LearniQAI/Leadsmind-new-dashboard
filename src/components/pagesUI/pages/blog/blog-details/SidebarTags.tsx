import Link from 'next/link';
import React from 'react';

const SidebarTags = () => {
    return (
        <>
            <div className="sidebar-widget widget_tag_cloud">
                <h4 className="sidebar-widget-title mb-[25px]">Tags</h4>
                <div className="tagcloud">
                    <Link href="#">HRM</Link>
                    <Link href="#">CRM</Link>
                    <Link href="#">Employee</Link>
                    <Link href="#">Customer</Link>
                    <Link href="#">Strategy</Link>
                    <Link href="#">Business</Link>
                </div>
            </div>
        </>
    );
};

export default SidebarTags;