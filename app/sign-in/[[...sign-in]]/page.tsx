import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0D1117] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="relative transition-colors duration-300">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 transition-colors duration-300"></div>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
              card: 'bg-gray-100 dark:bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl',
              headerTitle: 'text-black dark:text-white',
              headerSubtitle: 'text-gray-600 dark:text-gray-300',
              socialButtonsBlockButton: 'bg-slate-700 border-slate-600 text-black dark:text-white hover:bg-slate-600',
              socialButtonsBlockButtonText: 'text-black dark:text-white',
              dividerLine: 'bg-slate-700',
              dividerText: 'text-slate-500',
              formFieldLabel: 'text-gray-600 dark:text-gray-300',
              formFieldInput: 'bg-white dark:bg-[#0D1117] border-slate-700 text-black dark:text-white',
              footerActionText: 'text-gray-600 dark:text-gray-300',
              footerActionLink: 'text-blue-400 hover:text-blue-300',
              identityPreviewText: 'text-black dark:text-white',
              identityPreviewEditButtonIcon: 'text-blue-400'
            }
          }}
          routing="path" 
          path="/sign-in" 
        />
      </div>
    </div>
  );
}
