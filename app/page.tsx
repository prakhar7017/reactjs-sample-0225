"use client";

import { FC, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Wallet, Check, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrowserProvider, Contract, ethers } from "ethers";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Task = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  userId: string;
  verified?: boolean;
  txHash?: string;
  createdAt: Date;
};

type Column = {
  id: "todo" | "in-progress" | "done";
  title: string;
};

const columns: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

const TaskVerificationABI = [
  "function verifyTask(string memory taskId) public returns (bool)",
  "function isTaskVerified(string memory taskId) public view returns (bool)",
  "function getTaskVerifier(string memory taskId) public view returns (address)",
  "event TaskVerified(string taskId, address verifier)",
];

const CONTRACT_ADDRESS = "0x123..."; // Replace with your deployed contract address
const NETWORK_EXPLORER = "https://sepolia.etherscan.io"; // Replace with your network's explorer

interface TaskBoardProps {
  tasks: Task[];
}

const TaskBoard: FC = ()=>{
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "todo" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    const randomId = Math.floor(Math.random() * 1000);
    setProfileImage(`https://picsum.photos/id/${randomId}/200`);
    checkWalletConnection();
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const tasksCollection = collection(db, 'tasks');
      const tasksSnapshot = await getDocs(tasksCollection);
      const tasksList = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    }
  };

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        setWalletConnected(accounts.length > 0);
        setProvider(provider);

        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          setWalletConnected(accounts.length > 0);
        });

        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        setProvider(provider);
        setWalletConnected(true);
        toast({
          title: "Success",
          description: "Wallet connected successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to connect wallet",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please install MetaMask",
        variant: "destructive",
      });
    }
  };

  const verifyTaskOnChain = async (taskId: string) => {
    if (!provider) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifying(taskId);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, TaskVerificationABI, signer);
      
      const tx = await contract.verifyTask(taskId);
      const receipt = await tx.wait();

      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        verified: true,
        txHash: receipt.hash
      });

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, verified: true, txHash: receipt.hash } : task
      ));

      toast({
        title: "Success",
        description: "Task verified on blockchain",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify task on blockchain",
        variant: "destructive",
      });
    } finally {
      setVerifying(null);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const tasksCollection = collection(db, 'tasks');
      const docRef = await addDoc(tasksCollection, {
        ...newTask,
        userId: "user-1",
        verified: false,
        createdAt: new Date()
      });
      
      const task: Task = {
        id: docRef.id,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status as "todo" | "in-progress" | "done",
        userId: "user-1",
        verified: false,
        createdAt: new Date()
      };

      setTasks([task, ...tasks]);
      setNewTask({ title: "", description: "", status: "todo" });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(tasks.filter((task) => task.id !== taskId));
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: "todo" | "in-progress" | "done") => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus
      });

      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      toast({
        title: "Success",
        description: "Task moved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profileImage} alt="Profile" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Task Board</h1>
              <p className="text-muted-foreground">Manage your tasks efficiently</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant={walletConnected ? "outline" : "default"}
              onClick={connectWallet}
              disabled={walletConnected}
            >
              <Wallet className="mr-2 h-4 w-4" />
              {walletConnected ? "Connected" : "Connect Wallet"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newTask.status}
                      onValueChange={(value: "todo" | "in-progress" | "done") =>
                        setNewTask({ ...newTask, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((column) => (
                          <SelectItem key={column.id} value={column.id}>
                            {column.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateTask}>Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{column.title}</h2>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-sm">
                  {tasks.filter((task) => task.status === column.id).length}
                </span>
              </div>
              <div className="space-y-4">
                {tasks
                  .filter((task) => task.status === column.id)
                  .map((task) => (
                    <Card key={task.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{task.title}</h3>
                            {task.verified && (
                              <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                {task.txHash && (
                                  <a
                                    href={`${NETWORK_EXPLORER}/tx/${task.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-primary"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-destructive hover:text-destructive/90"
                          >
                            Delete
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {task.description}
                        </p>
                        <div className="flex gap-2">
                          <Select
                            value={task.status}
                            onValueChange={(value: "todo" | "in-progress" | "done") =>
                              handleMoveTask(task.id, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Move to" />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map((col) => (
                                <SelectItem key={col.id} value={col.id}>
                                  Move to {col.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {task.status === "done" && !task.verified && (
                            <Button
                              size="sm"
                              onClick={() => verifyTaskOnChain(task.id)}
                              disabled={!walletConnected || verifying === task.id}
                            >
                              {verifying === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TaskBoard;