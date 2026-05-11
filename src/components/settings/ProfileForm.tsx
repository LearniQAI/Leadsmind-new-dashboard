'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { profileSchema, type ProfileFormValues } from '@/lib/validations/account.schema'
import { updateProfile } from '@/app/actions/account'
import { createClient } from '@/lib/supabase/client'
import InputField from '@/components/elements/SharedInputs/InputField'

interface ProfileFormProps {
 user: {
  id: string
  email: string
  firstName: string
  lastName?: string
  avatarUrl?: string
 }
}

export function ProfileForm({ user }: ProfileFormProps) {
 const [isUploading, setIsUploading] = useState(false)
 const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl)
 const fileInputRef = useRef<HTMLInputElement>(null)

 const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<ProfileFormValues>({
  resolver: zodResolver(profileSchema),
  defaultValues: {
   firstName: user.firstName,
   lastName: user.lastName || '',
   avatarUrl: user.avatarUrl || '',
  },
 })

 async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0]
  if (!file) return

  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
   toast.error('Only PNG and JPG images are accepted')
   return
  }

  try {
   setIsUploading(true)
   const supabase = createClient()
   const fileExt = file.name.split('.').pop()
   const filePath = `${user.id}-${Math.random()}.${fileExt}`

   const { data, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true })

   if (uploadError) {
    toast.error(`Upload failed: ${uploadError.message}`)
    return
   }

   const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)

   setAvatarPreview(publicUrl)
   setValue('avatarUrl', publicUrl, { shouldDirty: true })
   toast.success('Avatar uploaded successfully')
  } catch (error: any) {
   toast.error(error?.message || 'Failed to upload image')
  } finally {
   setIsUploading(false)
  }
 }

 async function onSubmit(values: ProfileFormValues) {
  try {
   const result = await updateProfile(values)
   if (result.success) {
    toast.success('Profile updated successfully! 🎉')
   } else {
    toast.error(result.error || 'Something went wrong')
   }
  } catch {
   toast.error('Something went wrong')
  }
 }

 return (
  <div className="card__wrapper">
   <div className="card__title-wrap mb-[20px]">
    <h5 className="card__heading-title">Profile Information</h5>
   </div>
   <form onSubmit={handleSubmit(onSubmit)}>
    <div className="grid grid-cols-12 gap-x-6 gap-y-6">
     <div className="col-span-12">
      <div className="employee__profile-chnage">
       <div className="employee__profile-edit">
        <input
         type="file"
         id="avatarUpload"
         accept=".png, .jpg, .jpeg"
         ref={fileInputRef}
         onChange={handleFileChange}
        />
        <label htmlFor="avatarUpload">
         <i className="fa-solid fa-camera"></i>
        </label>
       </div>
       <div className="employee__profile-preview">
        <div
         className="employee__profile-preview-box"
         style={{
          backgroundImage: `url(${avatarPreview || "/assets/images/avatar/avatar.png"})`,
         }}
        >
         {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
           <div className="spinner-border text-primary" role="status"></div>
          </div>
         )}
        </div>
       </div>
      </div>
     </div>

     <div className="col-span-12 md:col-span-6">
      <InputField
       label="First Name"
       id="firstName"
       register={register("firstName")}
       error={errors.firstName}
       required={true}
      />
     </div>
     <div className="col-span-12 md:col-span-6">
      <InputField
       label="Last Name"
       id="lastName"
       register={register("lastName")}
       error={errors.lastName}
       required={false}
      />
     </div>
     <div className="col-span-12">
      <div className="form__input-box">
       <div className="form__input-title">
        <label>Email Address</label>
       </div>
       <div className="form__input">
        <input
         className="form-control"
         value={user.email}
         readOnly
         disabled
        />
       </div>
       <span className="text-muted small mt-1 block">Contact support to change your email</span>
      </div>
     </div>
     
     <div className="col-span-12 text-center mt-[10px]">
      <button className="btn btn-primary" type="submit" disabled={isSubmitting || isUploading}>
       {isSubmitting ? 'Saving...' : 'Save Profile'}
      </button>
     </div>
    </div>
   </form>
  </div>
 )
}
