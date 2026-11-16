import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

/** Pathless layout: everything under src/routes/_authed/ requires a signed-in user. */
export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { user: context.user }
  },
  component: Outlet,
})
