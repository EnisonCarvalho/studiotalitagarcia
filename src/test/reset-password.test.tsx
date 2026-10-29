import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), reset: vi.fn(), navigate: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: mocks.getUser, updateUser: mocks.updateUser, resetPasswordForEmail: mocks.reset } } }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options, useNavigate: () => mocks.navigate }));
import { ResetPassword } from "@/routes/reset-password";

describe("Recovery authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks(); sessionStorage.clear(); window.location.hash = "";
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
  });
  afterEach(() => { cleanup(); window.location.hash = ""; });
  it("blocks password changes for an ordinary signed-in session without a recovery link", async () => {
    render(<ResetPassword />);
    await screen.findByRole("button", { name: "Solicitar novo link" });
    expect(screen.queryByLabelText("Nova senha")).toBeNull();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("blocks an unverified recovery token", async () => {
    window.location.hash = "type=recovery";
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid token" } });
    render(<ResetPassword />);
    await screen.findByRole("button", { name: "Solicitar novo link" });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("updates only the password after the provider verifies recovery and shows success", async () => {
    window.location.hash = "type=recovery";
    render(<ResetPassword />);
    fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: "Example12345" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "Example12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha" }));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "Example12345" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Senha redefinida com sucesso.");
    fireEvent.click(screen.getByRole("button", { name: "Ir para o painel" }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin", replace: true });
  });
});