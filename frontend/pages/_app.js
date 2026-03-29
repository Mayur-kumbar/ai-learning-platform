import "../styles/globals.css";
import { AuthProvider } from "../context/AuthContext";
import '../styles/auth.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}