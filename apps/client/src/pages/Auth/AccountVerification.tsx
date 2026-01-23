import { useState, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { verifyUserAPI } from "src/apis";
import PageLoadingSpinner from "src/components/Loading/PageLoadingSpinner";

function AccountVerification() {
  const [searchParams] = useSearchParams();
  const { email, token } = Object.fromEntries([...searchParams]);

  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (email && token) {
      verifyUserAPI({ email, token }).then(() => setVerified(true));
    }
  }, [email, token]);

  if (!email || !token) {
    return <Navigate to='/404' />;
  }

  if (!verified) {
    return <PageLoadingSpinner caption='Verifying your account...' />;
  }

  return <Navigate to={`/login?verifiedEmail=${email}`} />;
}

export default AccountVerification;
