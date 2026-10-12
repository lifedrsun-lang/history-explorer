export function openVotePhotoPicker(input: HTMLInputElement | null | undefined, disabled: boolean) {
  if (!input || disabled || input.matches(":disabled")) return;
  input.value = "";
  input.click();
}
