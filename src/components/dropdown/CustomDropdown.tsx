import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';


interface DropdownItem {
    label: string; 
    link: string; 
}

interface CustomDropdownProps {
    items: DropdownItem[]; 
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ items }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Function to toggle dropdown visibility
    const toggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false); 
            }
        };

        // Add event listener to detect clicks outside
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            // Remove the event listener on cleanup
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="card__dropdown" ref={dropdownRef}>
            <div className="dropdown">
                <button onClick={toggleDropdown}>
                    <i className="fa-regular fa-ellipsis-vertical"></i>
                </button>
                <div className={`dropdown-list`} style={{ display: isDropdownOpen ? "block" : "none" }}>
                    {items.map((item, index) => (
                        <Link key={index} className="dropdown__item" href={item.link}>
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomDropdown;
