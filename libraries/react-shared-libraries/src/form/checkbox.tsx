'use client';

import React, { FC, forwardRef, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
export const Checkbox = forwardRef<
  null,
  {
    checked?: boolean;
    disableForm?: boolean;
    name?: string;
    className?: string;
    label?: string;
    // An accessible name for cases where the visible text lives outside this
    // component — /auth/register renders the consent sentence itself, links
    // and all, so `label` cannot carry it.
    ariaLabel?: string;
    // Passed by 8 call sites (TikTok, generator) and, before this, read by
    // none of them. Click still toggles a disabled box — that is a separate
    // bug (e2e/bugs.md E2E-03-06). What we must not do is *newly* hand a
    // disabled control to the keyboard, so it stays out of the tab order.
    disabled?: boolean;
    onChange?: (event: {
      target: {
        name?: string;
        value: boolean;
      };
    }) => void;
    variant?: 'default' | 'hollow';
  }
>((props, ref: any) => {
  const { checked, className, label, disableForm, variant, ariaLabel, disabled } =
    props;
  const form = useFormContext();
  const register = disableForm ? {} : form.register(props.name!);
  const watch = disableForm ? false : form.watch(props.name!);
  const val = watch || checked;

  const changeStatus = useCallback(() => {
    props?.onChange?.({
      target: {
        name: props.name!,
        value: !val,
      },
    });
    if (!disableForm) {
      // @ts-ignore
      register?.onChange?.({
        target: {
          name: props.name!,
          value: !val,
        },
      });
    }
  }, [val]);
  // Space and Enter, because this control is a div and the browser gives a div
  // none of the behaviour it would give an <input type="checkbox">.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }
      if (event.key === ' ' || event.key === 'Enter') {
        // Space would otherwise scroll the page.
        event.preventDefault();
        changeStatus();
      }
    },
    [changeStatus, disabled]
  );

  return (
    <div className="flex gap-[10px]">
      <div
        ref={ref}
        {...disableForm ? {} : form.register(props.name!)}
        onClick={changeStatus}
        onKeyDown={onKeyDown}
        // Without these three a keyboard or screen-reader user cannot reach
        // this control at all, let alone tick it — and on /auth/register that
        // closed registration to them completely, because the form refuses to
        // submit until the terms box is checked (e2e/bugs.md E2E-03-05).
        role="checkbox"
        aria-checked={!!val}
        aria-label={ariaLabel || label}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        className={clsx(
          'cursor-pointer rounded-[4px] select-none w-[24px] h-[24px] justify-center items-center flex text-white',
          // A focus ring is not decoration here: it is the only way someone
          // navigating by keyboard can tell where they are.
          'outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
          variant === 'default' || !variant
            ? 'bg-forth'
            : 'border-customColor1 border-2 bg-customColor2',
          className
        )}
      >
        {val && (
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        )}
      </div>
      {!!label && (
        <div className="cursor-pointer select-none" onClick={changeStatus}>
          {label}
        </div>
      )}
    </div>
  );
});
