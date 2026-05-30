import React, { FC, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModalWrapperComponent } from '@gitroom/frontend/components/new-launch/modal.wrapper.component';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Button } from '@gitroom/frontend/components/ui/button';

export const PreConditionComponentModal: FC = () => {
  const modal = useModals();
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="whitespace-pre-line">
        Ten kanał social był wcześniej połączony z innym kontem Postra.
        {'\n'}
        Aby kontynuować, przyśpiesz okres próbny z natychmiastową płatnością.{'\n'}
        {'\n'}
        ** Uwaga: konto nie będzie kwalifikować się do zwrotu,
        a opłata jest ostateczna.
      </div>
      <div className="flex gap-[2px] justify-center">
        <Button
          onClick={() => (window.location.href = '/billing?finishTrial=true')}
        >
          Przyśpiesz — obciąż mnie teraz
        </Button>
        <Button onClick={modal.closeCurrent} secondary={true}>Anuluj</Button>
      </div>
    </div>
  );
};
export const PreConditionComponent: FC = () => {
  const modal = useModals();
  const query = useSearchParams();
  useEffect(() => {
    if (query.get('precondition')) {
      modal.openModal({
        title: 'Wykryto podejrzaną aktywność',
        withCloseButton: true,
        classNames: {
          modal: 'text-textColor',
        },
        children: <PreConditionComponentModal />,
      });
    }
  }, []);
  return null;
};
