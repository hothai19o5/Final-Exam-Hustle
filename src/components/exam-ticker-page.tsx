
"use client";

import { useState, type ChangeEvent, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { format as formatDateFns, parse as parseDateFns } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExamCard } from "@/components/exam-card";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, ListChecks, AlertCircle, Loader2, Info } from "lucide-react";

export type ClientExamEntry = {
  id: string;
  courseName: string;
  examDate: string; // "dd.MM.yyyy"
  classCode: string;
  group: string;
  examTeam: string;
  examRoom: string;
};

export default function ExamTickerPage() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [classCodes, setClassCodes] = useState<string>('');
  const [exams, setExams] = useState<ClientExamEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "application/vnd.ms-excel"
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        });
        setExcelFile(null);
        if(event.target) event.target.value = "";
        return;
      }
      setExcelFile(file);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!excelFile) {
      toast({ variant: "destructive", title: "Error", description: "Please upload an Excel/CSV schedule." });
      return;
    }
    if (!classCodes.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter class codes." });
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      let localProcessedExams: ClientExamEntry[] = [];
      let parseErrorOccurred = false;
      let toastConfig: Parameters<typeof toast>[0] | null = null;
      const foundClassCodesForThisSearch = new Set<string>();

      try {
        const data = e.target?.result;
        if (!data) throw new Error("Failed to read file data.");

        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        const inputClassCodes = classCodes.split(',').map(code => code.trim().toLowerCase());

        jsonData.forEach((row, rowIndex) => {
          const getClassCode = (r: any) => r["Mã lớp"] || r["mã lớp"] || r["Class code"] || r["class code"];
          const getCourseName = (r: any) => r["Tên học phần"] || r["tên học phần"] || r["Course name"] || r["course name"];
          const getExamDate = (r: any) => r["Ngày thi"] || r["ngày thi"] || r["Exam date"] || r["exam date"];
          const getGroup = (r: any) => r["Ca thi"] || r["ca thi"] || r["Exam Group"] || r["exam group"] || r["Group"] || r["group"];
          const getExamTeam = (r: any) => r["Tổ thi"] || r["tổ thi"] || r["Exam Team"] || r["exam team"];
          const getExamRoom = (r: any) => r["Phòng thi"] || r["phòng thi"] || r["Exam Room"] || r["exam room"];

          const classCodeValue = getClassCode(row);
          const courseNameValue = getCourseName(row);
          const examDateValue = getExamDate(row);
          const groupValue = getGroup(row);
          const examTeamValue = getExamTeam(row);
          const examRoomValue = getExamRoom(row);

          const classCode = classCodeValue?.toString().trim().toLowerCase();
          const courseName = courseNameValue?.toString().trim();
          let examDateStr = "";

          if (examDateValue instanceof Date) {
            examDateStr = formatDateFns(examDateValue, 'dd.MM.yyyy');
          } else if (typeof examDateValue === 'string') {
            const trimmedDate = examDateValue.trim();
            if (/^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{4}$/.test(trimmedDate)) {
                 const parts = trimmedDate.replace(/\//g, '.').split('.');
                 const d = parts[0].padStart(2, '0');
                 const m = parts[1].padStart(2, '0');
                 const y = parts[2];
                 examDateStr = `${d}.${m}.${y}`;
            } else if (/^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2}$/.test(trimmedDate)) {
                const parts = trimmedDate.replace(/\//g, '.').split('.');
                const d = parts[0].padStart(2, '0');
                const m = parts[1].padStart(2, '0');
                const y = "20" + parts[2];
                examDateStr = `${d}.${m}.${y}`;
            }
            if (!/^\d{2}\.\d{2}\.\d{4}$/.test(examDateStr)) {
                examDateStr = "";
            }
          }

          const group = groupValue?.toString().trim() || 'N/A';
          const examTeam = examTeamValue?.toString().trim() || 'N/A';
          const examRoom = examRoomValue?.toString().trim() || 'N/A';

          if (
            classCode &&
            courseName &&
            examDateStr &&
            inputClassCodes.includes(classCode) &&
            !foundClassCodesForThisSearch.has(classCode)
          ) {
            localProcessedExams.push({
              id: `${classCode}-${courseName}-${examDateStr}-${group}-${examTeam}-${examRoom}-${rowIndex}`,
              classCode,
              courseName,
              examDate: examDateStr,
              group,
              examTeam,
              examRoom
            });
            foundClassCodesForThisSearch.add(classCode);
          } else if (classCode && courseName && inputClassCodes.includes(classCode) && !examDateStr) {
             console.warn(`Row ${rowIndex + 2}: Skipping exam for class ${classCode}, course ${courseName} due to missing or unparsable date. Found: '${examDateValue}'`);
          }
        });

      } catch (parseError: any) {
        console.error("Parsing failed:", parseError);
        setError("Failed to parse the file. Ensure it's a valid Excel/CSV and contains 'Mã lớp', 'Tên học phần', 'Ngày thi', 'Ca thi', 'Tổ thi', and 'Phòng thi' columns with correctly formatted data.");
        parseErrorOccurred = true;
      }

      let finalNewExamsCount = 0;

      if (!parseErrorOccurred && localProcessedExams.length > 0) {
        const currentExamIds = new Set(exams.map(ex => ex.id));
        const uniqueNewExamsFromThisSearch = localProcessedExams.filter(ne => !currentExamIds.has(ne.id));

        if (uniqueNewExamsFromThisSearch.length > 0) {
          setExams(prevExams => [...prevExams, ...uniqueNewExamsFromThisSearch]);
          finalNewExamsCount = uniqueNewExamsFromThisSearch.length;
        }
      }

      setIsLoading(false);

      if (parseErrorOccurred) {
        toast({ variant: "destructive", title: "Parsing Error", description: "Failed to parse the file. Check columns and data format." });
        return;
      }

      if (finalNewExamsCount > 0) {
        toastConfig = { title: "Success", description: `${finalNewExamsCount} new exam(s) added.` };
      } else if (localProcessedExams.length > 0 && finalNewExamsCount === 0) {
        toastConfig = { title: "Info", description: `The exam(s) found are already in your list.` };
      } else if (localProcessedExams.length === 0) {
        toastConfig = {
            title: "No Results",
            description: "No matching exams found. Check class codes and file content (columns: 'Mã lớp', 'Tên học phần', 'Ngày thi', 'Ca thi', 'Tổ thi', 'Phòng thi')."
        };
      }

      if (toastConfig) {
        toast(toastConfig);
      }
    };

    reader.onerror = () => {
        setError("Failed to read the uploaded file.");
        toast({ variant: "destructive", title: "File Read Error", description: "Could not read the file." });
        setIsLoading(false);
    };
    reader.readAsArrayBuffer(excelFile);
  };

  const handleDeleteExam = (idToDelete: string) => {
    setExams(prevExams => prevExams.filter(exam => exam.id !== idToDelete));
    toast({ title: "Exam Removed", description: "The exam has been removed from your list." });
  };

  const parseDateForSorting = (dateStr: string): Date => {
    try {
      return parseDateFns(dateStr, 'dd.MM.yyyy', new Date());
    } catch {
      return new Date(0); // Should not happen if validation is robust
    }
  };

  const sortedExams = [...exams].sort((a, b) => {
    const dateA = parseDateForSorting(a.examDate);
    const dateB = parseDateForSorting(b.examDate);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="container mx-auto flex flex-col items-center py-8 px-4 min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary-foreground drop-shadow-sm">Final Exam Hustle</h1>
        <p className="text-muted-foreground mt-2 text-lg">Upload your schedule and find your exams!</p>
      </header>

      <Card className="w-full max-w-xl p-6 sm:p-8 shadow-2xl rounded-xl">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-2xl font-semibold">Upload Schedule & Enter Classes</CardTitle>
          <CardDescription>Provide your exam schedule (Excel/CSV) and class codes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="flex items-center text-base">
                <UploadCloud className="mr-2 h-5 w-5 text-primary" />
                Exam Schedule (Excel/CSV)
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
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
            <p className="mt-4 text-lg text-muted-foreground">Processing your file...</p>
        </div>
      )}

      {!isLoading && sortedExams.length === 0 && !error && (
        <Card className="w-full max-w-xl mt-8 p-6 rounded-lg bg-secondary/30">
           <CardHeader className="flex flex-row items-center space-x-3 p-0 mb-2">
            <Info className="h-6 w-6 text-primary" />
            <CardTitle className="text-primary text-xl">No Exams Found</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground">No exams matching your class codes were found. Please check your class codes or ensure your file has 'Mã lớp', 'Tên học phần', 'Ngày thi', 'Ca thi', 'Tổ thi', and 'Phòng thi' columns with correctly formatted dates (dd.MM.yyyy).</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && sortedExams.length > 0 && (
        <section className="mt-10 w-full max-w-5xl"> {/* Increased max-width for grid */}
          <h2 className="text-3xl font-semibold mb-6 text-center text-primary-foreground">Your Upcoming Exams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onDelete={handleDeleteExam} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
