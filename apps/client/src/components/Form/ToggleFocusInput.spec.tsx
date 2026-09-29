import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ToggleFocusInput from "src/components/Form/ToggleFocusInput";
import { renderWithProviders } from "src/test/render";

const renameTo = async (text: string): Promise<HTMLElement> => {
  const input = screen.getByRole("textbox", { name: "Card title" });
  await userEvent.clear(input);
  await userEvent.type(input, text);
  await userEvent.tab();
  return input;
};

describe("<ToggleFocusInput />", () => {
  it("keeps the new value once the save succeeds", async () => {
    const onChangedValue = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ToggleFocusInput value='Old title' onChangedValue={onChangedValue} inputLabel='Card title' />);

    const input = await renameTo("New title");

    expect(onChangedValue).toHaveBeenCalledWith("New title");
    await waitFor(() => expect(input).toHaveValue("New title"));
  });

  it("puts the old value back when the save fails", async () => {
    const onChangedValue = vi.fn().mockRejectedValue(new Error("offline"));
    renderWithProviders(<ToggleFocusInput value='Old title' onChangedValue={onChangedValue} inputLabel='Card title' />);

    const input = await renameTo("New title");

    await waitFor(() => expect(input).toHaveValue("Old title"));
  });

  it("sends the trimmed value", async () => {
    const onChangedValue = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<ToggleFocusInput value='Old title' onChangedValue={onChangedValue} inputLabel='Card title' />);

    await renameTo("  Spaced title  ");

    expect(onChangedValue).toHaveBeenCalledWith("Spaced title");
  });

  it("follows a value changed elsewhere while it is not being edited", async () => {
    const onChangedValue = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <ToggleFocusInput value='Old title' onChangedValue={onChangedValue} inputLabel='Card title' />
    );

    rerender(<ToggleFocusInput value='Renamed elsewhere' onChangedValue={onChangedValue} inputLabel='Card title' />);

    expect(screen.getByRole("textbox", { name: "Card title" })).toHaveValue("Renamed elsewhere");
  });

  it("does not send the stale title when focused and left without typing while someone else renamed it", async () => {
    const onChangedValue = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <ToggleFocusInput value='Old title' onChangedValue={onChangedValue} inputLabel='Card title' />
    );
    const input = screen.getByRole("textbox", { name: "Card title" });
    await userEvent.click(input);

    rerender(<ToggleFocusInput value='Renamed elsewhere' onChangedValue={onChangedValue} inputLabel='Card title' />);
    await userEvent.tab();

    expect(onChangedValue).not.toHaveBeenCalled();
    expect(input).toHaveValue("Renamed elsewhere");
  });

  it("does not overwrite what the user is typing", async () => {
    const onChangedValue = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <ToggleFocusInput value='Old title' onChangedValue={onChangedValue} inputLabel='Card title' />
    );
    const input = screen.getByRole("textbox", { name: "Card title" });
    await userEvent.clear(input);
    await userEvent.type(input, "Typing");

    rerender(<ToggleFocusInput value='Renamed elsewhere' onChangedValue={onChangedValue} inputLabel='Card title' />);

    expect(input).toHaveValue("Typing");
  });
});
