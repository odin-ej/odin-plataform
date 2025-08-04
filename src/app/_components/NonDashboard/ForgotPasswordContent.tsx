// ForgotPassswordContent.tsx

"use client";

import React, { useState } from "react";
import SuccessStep from "./SuccessStep";
import ConfirmStep from "./ConfirmStep";
import RequestStep from "./RequestStep";



// 2. COMPONENTE PRINCIPAL (ForgotPassswordContent)
// ===================================================================
const ForgotPassswordContent = () => {
  const [step, setStep] = useState<"request" | "confirm" | "success">(
    "request"
  );
  const [email, setEmail] = useState("");


  if (step === "success") {
    return <SuccessStep />;
  }

  if (step === "confirm") {
    return (
      <ConfirmStep email={email} onConfirmSuccess={() => setStep("success")} />
    );
  }

  return (
    <RequestStep
      onRequestSuccess={(email) => {
        setStep("confirm");
        setEmail(email);
      }}
    />
  );
};

export default ForgotPassswordContent;
