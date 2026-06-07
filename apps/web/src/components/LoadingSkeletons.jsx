import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const CourseCardSkeleton = () => {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <Skeleton className="h-40 w-full rounded-none" />
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent className="mt-auto space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </CardContent>
    </Card>
  );
};

export const MaterialListSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-xl bg-card">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
};