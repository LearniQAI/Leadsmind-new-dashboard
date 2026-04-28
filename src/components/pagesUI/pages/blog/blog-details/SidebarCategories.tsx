import Link from 'next/link';
import React from 'react';

const SidebarCategories = () => {
    return (
        <>
            <div className="sidebar-widget widget_categories">
                <h4 className="sidebar-widget-title mb-[25px]">Categories</h4>
                <ul>
                    <li><Link href="#">HRM</Link></li>
                    <li><Link href="#">CRM</Link></li>
                    <li><Link href="#">Employee Engagement</Link></li>
                    <li><Link href="#">Customer Satisfaction</Link></li>
                    <li><Link href="#">Business Strategy</Link></li>
                </ul>
            </div>
        </>
    );
};

export default SidebarCategories;