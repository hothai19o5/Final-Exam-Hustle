
"use client";

import { useState, type ChangeEvent, type FormEvent, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { format as formatDateFns, parse as parseDateFns } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExamCard } from "@/components/exam-card";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, ListChecks, AlertCircle, Loader2, Info, FileText, Database } from "lucide-react";

export type ClientExamEntry = {
  id: string;
  courseName: string;
  examDate: string; // "dd.MM.yyyy"
  classCode: string;
  group: string;
  examTeam: string;
  examRoom: string;
  examCode: String;
};

export default function ExamTickerPage() {
  const [userExcelFile, setUserExcelFile] = useState<File | null>(null);
  const [classCodes, setClassCodes] = useState<string>('');
  const [displayedExams, setDisplayedExams] = useState<ClientExamEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [parsedExamsFromActiveFile, setParsedExamsFromActiveFile] = useState<ClientExamEntry[] | null>(null);
  const [activeFileSource, setActiveFileSource] = useState<'default' | 'user' | null>(null);
  const [isDefaultLoading, setIsDefaultLoading] = useState<boolean>(true);


  const parseExcelData = (data: ArrayBuffer, sourceFileName: string): ClientExamEntry[] => {
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    const localProcessedExams: ClientExamEntry[] = [];

    jsonData.forEach((row, rowIndex) => {
      const getClassCode = (r: any) => r["Mã lớp"];
      const getCourseName = (r: any) => r["Tên học phần"];
      const getExamDate = (r: any) => r["Ngày thi"];
      const getGroup = (r: any) => r["Nhóm"];
      const getExamTeam = (r: any) => r["Kíp thi"];
      const getExamRoom = (r: any) => r["Phòng thi"];
      const getExamCode = (r: any) => r["Mã lớp thi"];

      const classCodeValue = getClassCode(row);
      const courseNameValue = getCourseName(row);
      const examDateValue = getExamDate(row);
      const groupValue = getGroup(row);
      const examTeamValue = getExamTeam(row);
      const examRoomValue = getExamRoom(row);
      const examCodeValue = getExamCode(row);

      const classCode = classCodeValue?.toString().trim().toLowerCase();
      const examCode = examCodeValue?.toString().trim().toLowerCase();
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

      if (classCode && courseName && examDateStr) { // We add all valid rows, filtering happens later
        localProcessedExams.push({
          id: `${classCode}-${courseName}-${examDateStr}-${group}-${examTeam}-${examRoom}-${examCode}-${sourceFileName}-${rowIndex}`,
          classCode,
          courseName,
          examDate: examDateStr,
          group,
          examTeam,
          examRoom,
          examCode
        });
      }
    });
    return localProcessedExams;
  };

  useEffect(() => {
    const loadDefaultSchedule = async () => {
      setIsDefaultLoading(true);
      try {
        const response = await fetch('/default_schedule.xlsx');
        if (!response.ok) {
          throw new Error('Default schedule not found or failed to load.');
        }
        const arrayBuffer = await response.arrayBuffer();
        const defaultExamsData = parseExcelData(arrayBuffer, 'default_schedule.xlsx');
        setParsedExamsFromActiveFile(defaultExamsData);
        setActiveFileSource('default');
        setError(null); 
        toast({
          title: "Default Schedule Loaded",
          description: "You can now search class codes in the default schedule or upload your own.",
        });
      } catch (err: any) {
        console.warn("Failed to load default schedule:", err.message);
        setActiveFileSource(null);
        // Do not set a global error, user can still upload their file
      } finally {
        setIsDefaultLoading(false);
      }
    };
    loadDefaultSchedule();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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
        setUserExcelFile(null);
        if(event.target) event.target.value = ""; // Reset file input
        return;
      }
      setUserExcelFile(file);
      setIsLoading(true);
      setError(null);
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const allParsedExams = parseExcelData(e.target.result as ArrayBuffer, file.name);
            setParsedExamsFromActiveFile(allParsedExams);
            setActiveFileSource('user');
            setDisplayedExams([]); // Reset displayed exams when new file is uploaded
            toast({ title: "File Loaded", description: `Successfully parsed "${file.name}". Enter class codes to search.` });
          } else {
            throw new Error("Failed to read file data.");
          }
          setIsLoading(false);
        };
        reader.onerror = () => {
          setError(`Failed to read the uploaded file: ${file.name}.`);
          toast({ variant: "destructive", title: "File Read Error", description: "Could not read the file." });
          setIsLoading(false);
          setActiveFileSource(null); // Revert to no active source if user file fails
          setParsedExamsFromActiveFile(null);
        };
        reader.readAsArrayBuffer(file);
      } catch (parseError: any) {
        setError(`Failed to parse "${file.name}". Ensure it's a valid Excel/CSV.`);
        toast({ variant: "destructive", title: "Parsing Error", description: `Failed to parse "${file.name}".` });
        setIsLoading(false);
        setActiveFileSource(null);
        setParsedExamsFromActiveFile(null);
      }
    } else { // If user deselects file
      setUserExcelFile(null);
      // If a default schedule was loaded, revert to it
      if (activeFileSource === 'user') { // only if user file was active
        const loadDefaultAgain = async () => {
            setIsDefaultLoading(true);
            try {
                const response = await fetch('/default_schedule.xlsx');
                if (!response.ok) throw new Error('Default schedule not found.');
                const arrayBuffer = await response.arrayBuffer();
                const defaultExamsData = parseExcelData(arrayBuffer, 'default_schedule.xlsx');
                setParsedExamsFromActiveFile(defaultExamsData);
                setActiveFileSource('default');
                setDisplayedExams([]);
                toast({ title: "Switched to Default Schedule", description: "User file removed. Default schedule is now active." });
            } catch (err) {
                setParsedExamsFromActiveFile(null);
                setActiveFileSource(null);
                setDisplayedExams([]);
                toast({ title: "Info", description: "User file removed. No active schedule."});
            } finally {
                setIsDefaultLoading(false);
            }
        };
        loadDefaultAgain();
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let toastConfig: Parameters<typeof toast>[0] | null = null;

    if (!parsedExamsFromActiveFile) {
      toast({ variant: "destructive", title: "Error", description: activeFileSource === 'default' && isDefaultLoading ? "Default schedule is still loading." : "Please load a schedule file first (default or upload your own)." });
      return;
    }
    if (!classCodes.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter class codes." });
      return;
    }

    setIsLoading(true); // For search processing
    setError(null);

    const inputClassCodesArray = classCodes.split(',').map(code => code.trim().toLowerCase()).filter(code => code);
    const localFoundExamsForThisSearch: ClientExamEntry[] = [];
    const foundClassCodesInThisSearch = new Set<string>(); // To track first match for each input class code

    if (parsedExamsFromActiveFile) {
        for (const exam of parsedExamsFromActiveFile) {
            if (inputClassCodesArray.includes(exam.classCode) && !foundClassCodesInThisSearch.has(exam.classCode)) {
                localFoundExamsForThisSearch.push(exam);
                foundClassCodesInThisSearch.add(exam.classCode);
            }
        }
    }
    
    const currentDisplayedExamIds = new Set(displayedExams.map(ex => ex.id));
    const uniqueNewExamsToDisplay = localFoundExamsForThisSearch.filter(ne => !currentDisplayedExamIds.has(ne.id));

    if (uniqueNewExamsToDisplay.length > 0) {
      setDisplayedExams(prevExams => [...prevExams, ...uniqueNewExamsToDisplay]);
      toastConfig = { title: "Search Complete", description: `${uniqueNewExamsToDisplay.length} new exam(s) added to your list.` };
    } else if (localFoundExamsForThisSearch.length > 0 && uniqueNewExamsToDisplay.length === 0) {
      toastConfig = { title: "Info", description: "The exam(s) found in this search are already in your list." };
    } else {
       toastConfig = {
        title: "No New Results",
        description: "No new exams matching your criteria found in the current schedule. Check class codes and file content (columns: 'Mã lớp', 'Tên học phần', 'Ngày thi', etc.)."
      };
    }

    setIsLoading(false);
    if (toastConfig) {
        toast(toastConfig);
    }
  };

  const handleDeleteExam = (idToDelete: string) => {
    setDisplayedExams(prevExams => prevExams.filter(exam => exam.id !== idToDelete));
    toast({ title: "Exam Removed", description: "The exam has been removed from your list." });
  };

  const parseDateForSorting = (dateStr: string): Date => {
    try {
      return parseDateFns(dateStr, 'dd.MM.yyyy', new Date());
    } catch {
      return new Date(0);
    }
  };

  const sortedDisplayedExams = [...displayedExams].sort((a, b) => {
    const dateA = parseDateForSorting(a.examDate);
    const dateB = parseDateForSorting(b.examDate);
    return dateA.getTime() - dateB.getTime();
  });
  
  const getActiveFileDescription = () => {
    if (activeFileSource === 'user' && userExcelFile) {
      return `Using your uploaded file: "${userExcelFile.name}"`;
    }
    if (activeFileSource === 'default') {
      return "Using the default exam schedule.";
    }
    if (isDefaultLoading) {
      return "Loading default schedule...";
    }
    return "No exam schedule loaded. Upload a file or try reloading if default schedule failed.";
  };


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
                className="file:text-primary file:font-medium hover:file:bg-primary/10"
              />
               <p className="text-xs text-muted-foreground flex items-center pt-1">
                {activeFileSource === 'user' && userExcelFile ? <FileText className="mr-1 h-3 w-3 text-green-500" /> : 
                 activeFileSource === 'default' ? <Database className="mr-1 h-3 w-3 text-blue-500" /> :
                 isDefaultLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : 
                 <AlertCircle className="mr-1 h-3 w-3 text-orange-500" />}
                {getActiveFileDescription()}
              </p>
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
                disabled={(!parsedExamsFromActiveFile && !isDefaultLoading) || isLoading}
              />
            </div>
            <Button 
                type="submit" 
                className="w-full text-lg py-3 bg-accent hover:bg-accent/90 text-accent-foreground" 
                disabled={isLoading || (!parsedExamsFromActiveFile && !isDefaultLoading) || (isDefaultLoading && activeFileSource !== 'user')}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {userExcelFile ? 'Loading File...' : 'Searching...'}
                </>
              ) : (
                "Add"
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

      {isLoading && !error && !userExcelFile && ( // Show generic loading for search or default file load
         <div className="mt-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-lg text-muted-foreground">
                {isDefaultLoading && activeFileSource !== 'user' ? 'Loading default schedule...' : 'Processing...'}
            </p>
        </div>
      )}

      {!isLoading && sortedDisplayedExams.length === 0 && !error && (
        <Card className="w-full max-w-xl mt-8 p-6 rounded-lg bg-secondary/30">
           <CardHeader className="flex flex-row items-center space-x-3 p-0 mb-2">
            <Info className="h-6 w-6 text-primary" />
            <CardTitle className="text-primary text-xl">No Exams To Display</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground">
                {activeFileSource ? 'No exams found matching your search criteria in the current schedule.' : isDefaultLoading ? 'Waiting for default schedule to load or for you to upload a file.' : "Upload your exam schedule or try reloading if the default schedule failed to load."}
                {' '}Ensure your file has 'Mã lớp', 'Tên học phần', 'Ngày thi', etc., or check your search terms.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && sortedDisplayedExams.length > 0 && (
        <section className="mt-10 w-full max-w-5xl">
          <h2 className="text-3xl font-semibold mb-6 text-center text-primary-foreground">Your Upcoming Exams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDisplayedExams.map((exam) => (
              <ExamCard key={exam.id} exam={exam} onDelete={handleDeleteExam} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

