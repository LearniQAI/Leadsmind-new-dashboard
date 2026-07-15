import Image from 'next/image';

const DashboardFooter = () => {
 const getCurrentYear = () => {
  return new Date().getFullYear();
 };

 return (
  <>
   <footer className="footer border-t border-dash-border mt-6">
    <div className="grid grid-cols-12">
     <div className="col-span-12 xl:col-span-12">
      <div className="card__footer flex items-center justify-center gap-3 py-8">
       <Image
        src="/assets/images/brand/LeadsMind_Logo.png.png"
        alt="LeadsMind"
        width={120}
        height={32}
        className="object-contain opacity-80"
       />
       <span className="h-4 w-px bg-dash-border" />
       <p className="text-[12px] font-medium !text-dash-textMuted">
        Copyright © {getCurrentYear()} LeadsMind. All rights reserved.
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
