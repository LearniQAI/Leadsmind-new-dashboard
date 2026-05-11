'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { passwordSchema, type PasswordFormValues } from '@/lib/validations/account.schema'
import { updatePassword } from '@/app/actions/account'
import InputField from '@/components/elements/SharedInputs/InputField'

export function PasswordForm() {
 const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<PasswordFormValues>({
  resolver: zodResolver(passwordSchema),
  defaultValues: {
   currentPassword: '',
   newPassword: '',
   confirmPassword: '',
  },
 })

 async function onSubmit(values: PasswordFormValues) {
  try {
   const result = await updatePassword(values)
   if (result.success) {
    toast.success('Password updated successfully! 🔐')
    reset()
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
    <h5 className="card__heading-title">Security Settings</h5>
   </div>
   <form onSubmit={handleSubmit(onSubmit)}>
    <div className="grid grid-cols-12 gap-x-6 gap-y-6">
     <div className="col-span-12">
      <InputField
       label="Current Password"
       id="currentPassword"
       type="password"
       register={register("currentPassword")}
       error={errors.currentPassword}
       required={true}
      />
     </div>
     <div className="col-span-12 md:col-span-6">
      <InputField
       label="New Password"
       id="newPassword"
       type="password"
       register={register("newPassword")}
       error={errors.newPassword}
       required={true}
      />
     </div>
     <div className="col-span-12 md:col-span-6">
      <InputField
       label="Confirm New Password"
       id="confirmPassword"
       type="password"
       register={register("confirmPassword")}
       error={errors.confirmPassword}
       required={true}
      />
     </div>
     
     <div className="col-span-12 text-center mt-[10px]">
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
       {isSubmitting ? 'Updating...' : 'Update Password'}
      </button>
     </div>
    </div>
   </form>
  </div>
 )
}
