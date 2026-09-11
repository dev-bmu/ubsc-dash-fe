import { z } from 'zod'

export const LoginValidation = z.object({
  email: z.email({ message: 'Format email tidak valid.' }),
  password: z.string().min(1, { message: 'Password tidak boleh kosong.' })
})

export type LoginFormValues = z.infer<typeof LoginValidation>
