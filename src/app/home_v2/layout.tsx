import Script from 'next/script';
import './globals.css';

export default function HomeV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,300i,400,400i,500,500i,600,600i,700,700i&amp;subset=latin-ext" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      <Script src="https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js" />
      <Script src="https://code.jquery.com/jquery-3.2.1.min.js" />
      <Script src="https://kit.fontawesome.com/a076d05399.js" crossOrigin="anonymous" />
      <div id="page-overlay" className="visible incoming">
        <div className="loader-wrapper-outer">
          <div className="loader-wrapper-inner">
            <div className="lds-double-ring">
              <div></div>
              <div></div>
              <div>
                <div></div>
              </div>
              <div>
                <div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
