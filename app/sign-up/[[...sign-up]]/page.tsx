import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
              card: 'bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-400',
              socialButtonsBlockButton: 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600',
              socialButtonsBlockButtonText: 'text-white',
              dividerLine: 'bg-slate-700',
              dividerText: 'text-slate-500',
              formFieldLabel: 'text-slate-300',
              formFieldInput: 'bg-slate-900 border-slate-700 text-white',
              footerActionText: 'text-slate-400',
              footerActionLink: 'text-blue-400 hover:text-blue-300',
              identityPreviewText: 'text-white',
              identityPreviewEditButtonIcon: 'text-blue-400'
            }
          }}
          routing="path" 
          path="/sign-up" 
        />
      </div>
    </div>
  );
}
