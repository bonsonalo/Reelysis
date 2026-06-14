'use client'

import { useInstagramAccounts } from '@/features/instagram/hooks/useInstagramAccounts'
import { useDisconnectInstagram } from '@/features/instagram/hooks/useDisconnectInstagram'
import { useAuth } from '@/store/hook'
import { 
  User, 
  Instagram, 
  ShieldCheck, 
  Trash2, 
  AlertCircle,
  LogOut,
  Mail,
  Lock,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: accounts, isLoading } = useInstagramAccounts()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnectInstagram()
  const account = accounts?.[0]

  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false)

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white">Account Settings</h1>
        <p className="text-muted-foreground">Manage your connections, profile, and security settings.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Instagram Connection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-[10px] font-black">
             <Instagram className="h-3 w-3" />
             Social Connections
          </div>
          
          <div className="rounded-3xl border border-white/5 bg-[#09090b] overflow-hidden">
             <div className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <div className="h-16 w-16 rounded-2xl bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                      {account?.profile_picture_url ? (
                        <img src={account.profile_picture_url} alt={account.username} className="h-full w-full object-cover" />
                      ) : (
                        <Instagram className="h-8 w-8 text-zinc-600" />
                      )}
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white">
                        {account ? `@${account.username}` : "Instagram not connected"}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {account ? `Connected on ${new Date().toLocaleDateString()}` : "Link your account to start analysis"}
                      </p>
                   </div>
                </div>
                
                {account ? (
                  <Button 
                    variant="outline" 
                    className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                    onClick={() => setIsDisconnectConfirmOpen(true)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button className="font-bold">Connect Now</Button>
                )}
             </div>
             
             {isDisconnectConfirmOpen && (
               <div className="p-8 border-t border-red-500/10 bg-red-500/[0.02] flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-3">
                     <AlertCircle className="h-5 w-5 text-red-500" />
                     <p className="text-sm text-zinc-300">Are you sure? This will delete all your analyzed Reels data.</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <Button variant="ghost" onClick={() => setIsDisconnectConfirmOpen(false)}>Cancel</Button>
                     <Button 
                      className="bg-red-500 hover:bg-red-600 font-bold"
                      onClick={() => {
                        disconnect()
                        setIsDisconnectConfirmOpen(false)
                      }}
                      disabled={isDisconnecting}
                     >
                       {isDisconnecting ? "Disconnecting..." : "Yes, Disconnect"}
                     </Button>
                  </div>
               </div>
             )}
          </div>
        </section>

        {/* Profile Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-[10px] font-black">
             <User className="h-3 w-3" />
             Personal Information
          </div>
          
          <div className="rounded-3xl border border-white/5 bg-[#09090b] p-8 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase">Display Name</label>
                   <div className="flex items-center gap-3 h-12 px-4 rounded-xl bg-white/5 border border-white/5 text-white font-medium">
                      {user?.name}
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
                   <div className="flex items-center gap-3 h-12 px-4 rounded-xl bg-white/5 border border-white/5 text-zinc-500 italic">
                      <Mail className="h-4 w-4" />
                      {user?.email}
                   </div>
                </div>
             </div>
             <Button variant="outline" className="border-white/10 hover:bg-white/5 font-bold">Update Profile</Button>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-500 uppercase tracking-widest text-[10px] font-black">
             <ShieldCheck className="h-3 w-3" />
             Security & Access
          </div>
          
          <div className="rounded-3xl border border-white/5 bg-[#09090b] p-8">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <Lock className="h-5 w-5" />
                   </div>
                   <div>
                      <p className="font-bold text-white">Password</p>
                      <p className="text-xs text-zinc-500">Last changed 2 months ago</p>
                   </div>
                </div>
                <Button variant="outline" className="border-white/10 hover:bg-white/5 font-bold">Change Password</Button>
             </div>
          </div>
        </section>

      </div>
    </div>
  )
}
