"use client";

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { extractExamInfo, type ExtractExamInfoOutput } from '@/ai/flows/extract-exam-info';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExamCard } from "@/components/exam-card";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, ListChecks, AlertCircle, Loader2, Info } from "lucide-react";

async function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ExamTickerPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [classCodes, setClassCodes] = useState<string>('');
  const [exams, setExams] = useState<ExtractExamInfoOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type !== "application/pdf") {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
        });
        setPdfFile(null);
        event.target.value = ""; // Reset file input
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pdfFile) {
      toast({ variant: "destructive", title: "Error", description: "Please upload a PDF schedule." });
      return;
    }
    if (!classCodes.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter class codes." });
      return;
    }

    setIsLoading(true);
    setError(null);
    setExams(null);

    try {
      const pdfDataUri = await fileToDataUri(pdfFile);
      const result = await extractExamInfo({ pdfDataUri, classCodes });
      
      if (result && result.length > 0) {
        setExams(result);
        toast({ title: "Success", description: "Exam information extracted." });
      } else {
        setExams([]); // Set to empty array to show "No exams found"
        toast({ title: "No Results", description: "No matching exams found for the provided class codes." });
      }
    } catch (e: any) {
      console.error("Extraction failed:", e);
      const errorMessage = e.message || "Failed to extract exam information. Please try again.";
      setError(errorMessage);
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex flex-col items-center py-8 px-4 min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary-foreground drop-shadow-sm">Exam Ticker</h1>
        <p className="text-muted-foreground mt-2 text-lg">Countdown to your final exams!</p>
      </header>

      <Card className="w-full max-w-xl p-6 sm:p-8 shadow-2xl rounded-xl">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-2xl font-semibold">Upload Schedule & Enter Classes</CardTitle>
          <CardDescription>Provide your exam PDF and class codes to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload" className="flex items-center text-base">
                <UploadCloud className="mr-2 h-5 w-5 text-primary" />
                Exam Schedule PDF
              </Label>
              <Input 
                id="pdf-upload" 
                type="file" 
                accept=".pdf"
                onChange={handleFileChange} 
                required 
                className="file:text-primary file:font-medium hover:file:bg-primary/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-codes" className="flex items-center text-base">
                <ListChecks className="mr-2 h-5 w-5 text-primary" />
                Class Codes (comma-separated)
              </Label>
              <Input 
                id="class-codes" 
                type="text" 
                value={classCodes} 
                onChange={(e) => setClassCodes(e.target.value)} 
                placeholder="e.g., 157324, 158785" 
                required 
              />
            </div>
            <Button type="submit" className="w-full text-lg py-3 bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Get Exam Dates"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="w-full max-w-xl mt-8 bg-destructive/10 border-destructive text-destructive-foreground p-6 rounded-lg">
          <CardHeader className="flex flex-row items-center space-x-3 p-0 mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive text-xl">An Error Occurred</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading && !error && (
         <div className="mt-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-lg text-muted-foreground">Extracting exam information...</p>
        </div>
      )}

      {!isLoading && exams && exams.length === 0 && !error && (
        <Card className="w-full max-w-xl mt-8 p-6 rounded-lg bg-secondary/30">
           <CardHeader className="flex flex-row items-center space-x-3 p-0 mb-2">
            <Info className="h-6 w-6 text-primary" />
            <CardTitle className="text-primary text-xl">No Exams Found</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground">No exams matching your class codes were found in the PDF. Please check your class codes or try a different PDF.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && exams && exams.length > 0 && (
        <section className="mt-10 w-full max-w-2xl">
          <h2 className="text-3xl font-semibold mb-6 text-center text-primary-foreground">Your Upcoming Exams</h2>
          <div className="space-y-6">
            {exams.map((exam, index) => (
              <ExamCard key={index} exam={exam} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
