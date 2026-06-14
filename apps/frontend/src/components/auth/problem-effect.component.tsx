import { ProblemEffectCard } from '@gitroom/frontend/components/auth/problem-effect.card';

const scenarios1 = [
  {
    title: 'Publishing chaos',
    description: 'Content planning',
    content:
      'Posts get made at the last minute and deadlines keep slipping.\n\nPostra brings order to your publishing calendar, so you instantly see what goes out, where and when.',
  },
  {
    title: 'Out of ideas',
    description: 'AI for content',
    content:
      'Instead of starting every post from scratch, you can move faster with a ready direction.\n\nPostra helps you generate topics, hooks and content drafts that you then refine to match your style.',
  },
  {
    title: 'Several channels at once',
    description: 'One workspace',
    content:
      'Facebook, Instagram, TikTok and LinkedIn often live apart, and publishing becomes manual and inconsistent.\n\nPostra brings planning and publishing into one place, so it is easier to stay organized across channels.',
  },
];

const scenarios2 = [
  {
    title: 'Irregular communication',
    description: 'A steady publishing rhythm',
    content:
      'Content shows up in bursts, then goes quiet.\n\nPostra helps you build up a backlog of material and stay consistent without firefighting every day.',
  },
  {
    title: 'Working with a client or team',
    description: 'A better workflow',
    content:
      'Approvals, edits and comments are scattered across messages and documents.\n\nPostra brings order to the process, so you can see faster what is ready, what is waiting and what needs work.',
  },
  {
    title: 'Not sure what works',
    description: 'Better decisions',
    content:
      'You publish content, but it is hard to tell which formats and channels actually deliver.\n\nPostra gives you analytics that help you spot faster what is worth repeating and what to drop.',
  },
];

export const ProblemEffectComponent = () => {
  return (
    <div className="relative mt-[24px] h-[440px] w-full max-w-[900px] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden px-[12px] xl:px-[24px]">
        <div className="pointer-events-none absolute left-0 top-0 z-[100] h-[140px] w-full bg-[linear-gradient(180deg,rgba(10,14,26,0.96),rgba(10,14,26,0))]" />
        <div className="pointer-events-none absolute bottom-0 left-0 z-[100] h-[140px] w-full bg-[linear-gradient(0deg,rgba(10,14,26,0.96),rgba(10,14,26,0))]" />
        <div className="flex justify-center gap-[12px]">
          <div className="flex flex-1 flex-col gap-[12px] animate-marqueeUp">
            {[1, 2].flatMap((p) =>
              scenarios1.map((item) => (
                <div key={p + '_' + item.title} className="flex flex-col gap-[12px]">
                  <ProblemEffectCard {...item} />
                </div>
              ))
            )}
          </div>
          <div className="flex flex-1 flex-col gap-[12px] animate-marqueeDown">
            {[1, 2].flatMap((p) =>
              scenarios2.map((item) => (
                <div key={p + '_' + item.title} className="flex flex-col gap-[12px]">
                  <ProblemEffectCard {...item} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
