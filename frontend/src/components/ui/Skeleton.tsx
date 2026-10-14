import { clsx } from 'clsx';

interface SkeletonProps {
  class?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
  circle?: boolean;
}

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={clsx(
        'skeleton',
        props.circle ? 'rounded-full' : props.rounded ? 'rounded-lg' : 'rounded',
        props.class,
      )}
      style={{
        height: props.height ?? '1rem',
        width: props.width ?? '100%',
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div class="bg-white rounded-lg p-3 shadow-card space-y-2">
      <Skeleton height="0.875rem" width="80%" />
      <Skeleton height="0.75rem" width="60%" />
      <div class="flex items-center justify-between pt-1">
        <Skeleton height="1.25rem" width="4rem" rounded />
        <Skeleton height="1.5rem" width="1.5rem" circle />
      </div>
    </div>
  );
}

export function ColumnSkeleton() {
  return (
    <div class="bg-slate-100 rounded-xl p-3 w-64 flex flex-col gap-2">
      <Skeleton height="1.25rem" width="50%" />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
