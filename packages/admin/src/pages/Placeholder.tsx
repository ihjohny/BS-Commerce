import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

export function Placeholder({ title, description, icon: Icon = Construction }: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description ?? 'This surface is built in a later phase.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
            <EmptyTitle>Coming in the next phase</EmptyTitle>
            <EmptyDescription>
              This section is part of the phased migration. See{' '}
              <Link
                to="/"
                className="text-primary underline-offset-4 hover:underline"
              >
                the dashboard
              </Link>{' '}
              meanwhile.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  )
}
