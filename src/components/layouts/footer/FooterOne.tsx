import Link from 'next/link';
import React from 'react';

const DashboardFooter = () => {
  // Function to get the current year
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  return (
    <>
      {/* -- footer area start -- */}
      <footer className="footer">
        <div className="grid grid-cols-12">
          <div className="col-span-12 xl:col-span-12">
            <div className="card__footer flex justify-center">
              <p>
                Copyright © {getCurrentYear()}{' '}
                <span className="text-black dark:text-black-dark">Manez.</span> Designed with by{' '}
                <Link href="https://themeforest.net/user/bdevs" target="_blank">
                  Bdevs
                </Link> All rights reserved
              </p>
            </div>
          </div>
        </div>
      </footer>
      {/* -- footer area end -- */}
    </>
  );
};

export default DashboardFooter;
