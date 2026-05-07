import Image from 'next/image';

const DashboardFooter = () => {
  const getCurrentYear = () => {
    return new Date().getFullYear();
  };

  return (
    <>
      <footer className="footer">
        <div className="grid grid-cols-12">
          <div className="col-span-12 xl:col-span-12">
            <div className="card__footer flex flex-col items-center justify-center py-6">
              <div className="mb-4 opacity-70 hover:opacity-100 transition-opacity">
                <Image 
                  src="/assets/images/brand/LeadsMind_Logo.png.png" 
                  alt="LeadsMind" 
                  width={120} 
                  height={32} 
                  className="object-contain brightness-0 invert"
                />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                Copyright © {getCurrentYear()} LeadsMind. All rights reserved
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
