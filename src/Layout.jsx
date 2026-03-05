export default function Layout({ children, currentPageName }) {
  // All pages are full-screen mobile apps — no wrapping chrome needed
  return (
    <>
      <style>{`
        html, body, #root {
          background: #ffffff;
          font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif;
          height: 100%;
        }
      `}</style>
      {children}
    </>
  );
}