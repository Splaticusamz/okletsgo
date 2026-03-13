import './globals.css';

export const metadata = {
  title: "OK LET'S GO",
  description: 'Okanagan events and internal ops app',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
