import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TaskBoard from  "../app/page";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BrowserProvider } from "ethers";
import { ComponentType } from "react";

let Board:ComponentType = TaskBoard;

// Mock dependencies
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

jest.mock("@/lib/firebase", () => ({
  db: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
}));

jest.mock("ethers", () => ({
  BrowserProvider: jest.fn().mockImplementation(() => ({
    listAccounts: jest.fn().mockResolvedValue(["0x123"]),
    getSigner: jest.fn().mockResolvedValue({
      getAddress: jest.fn().mockResolvedValue("0x123"),
    }),
  })),
}));

describe("TaskBoard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders TaskBoard component", async () => {
    render(<Board />);
    expect(screen.getByText("Task Board")).toBeInTheDocument();
  });

  test("fetches and displays tasks", async () => {
    const mockTasks = [
      {
        id: "1",
        title: "Test Task 1",
        description: "This is a test task",
        status: "todo",
        userId: "user-1",
        verified: false,
        createdAt: new Date(),
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({
      docs: mockTasks.map((task) => ({
        id: task.id,
        data: () => task,
      })),
    });

    render(<TaskBoard />);

    await waitFor(() => {
      expect(screen.getByText("Test Task 1")).toBeInTheDocument();
    });
  });

  test("adds a new task", async () => {
    (addDoc as jest.Mock).mockResolvedValue({ id: "2" });

    render(<TaskBoard />);

    fireEvent.click(screen.getByText("Add Task"));

    fireEvent.change(screen.getByPlaceholderText("Enter task title"), {
      target: { value: "New Task" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter task description"), {
      target: { value: "Task Description" },
    });

    fireEvent.click(screen.getByText("Create Task"));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
    });
  });

  test("deletes a task", async () => {
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);

    const mockTask = {
      id: "1",
      title: "Test Task 1",
      description: "This is a test task",
      status: "todo",
      userId: "user-1",
      verified: false,
      createdAt: new Date(),
    };

    render(<TaskBoard />);

    await waitFor(() => {
      fireEvent.click(screen.getByText("Delete Task"));
    });

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  test("connects wallet", async () => {
    render(<TaskBoard />);

    fireEvent.click(screen.getByText("Connect Wallet"));

    await waitFor(() => {
      expect(BrowserProvider).toHaveBeenCalled();
    });
  });
});
