using System;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace FemCadCommand
{
    public static class FliProcessManager
    {
        private const string StopText = "--FcsScriptEnD--";

        private static bool HideNextSendedOutput { get; set; }
        private static int NubersOfSendedLined { get; set; }
        private static Process FliProcess { get; set; }
        private static bool Verbose { get; set; }

        public static void StartFliProcess(string FilePath, string[] ArgumentList, bool verbose)
        {
            Verbose = verbose;

            var startInfo = new ProcessStartInfo()
            {
                FileName = FilePath,
                Arguments = string.Join(" ", ArgumentList.Select(a => a.Contains(" ") ? '"' + a + '"' : a)),
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                RedirectStandardInput = true,
                StandardOutputEncoding = Console.OutputEncoding,
                StandardErrorEncoding = Console.OutputEncoding,
            };
            FliProcess = new Process()
            {
                StartInfo = startInfo,
            };

            FliProcess.OutputDataReceived += Process_OutputDataReceived;

            if (FliProcess.Start())
            {
                FliProcess.BeginOutputReadLine();
            }

            FliProcess.WaitForExit();
        }

        public static string CreateAndSaveScriptFile(string souborFcs, Command prikaz)
        {
            var runScriptFileName = Path.GetRandomFileName() + ".fcs";
            var tempFolderPath = Path.Combine(Path.GetTempPath(), "FcsVscode");
            string gclassName = "cls";

            Directory.CreateDirectory(tempFolderPath);

            var runScriptPath = Path.Combine(tempFolderPath, runScriptFileName);

            using (StreamWriter writer = File.CreateText(runScriptPath))
            {
                writer.WriteLine($"gclass {{{gclassName}}} filename (\"" + souborFcs.Replace(@"\", "/") + "\")");
                writer.WriteLine(prikaz.FullCommand(gclassName));
                writer.WriteLine("UkoncujiciPrikaz = " + "\"" + StopText + "\"");
                writer.WriteLine("print UkoncujiciPrikaz");
            }

            return runScriptPath;
        }

        private static void Process_OutputDataReceived(object sender, DataReceivedEventArgs e)
        {
            var hiddingLines = new string[]
            {
                "Interpreting",
                "Opening",
                "Analysing",
                "Read+Parsing",
                "Creating GClass",
                "Running"
            };

            // Process process = (Process)sender;
            string sendedData = e.Data;
            if (sendedData != null && !HideNextSendedOutput) // pokud je null tak je konec
            {
                NubersOfSendedLined++;
                bool showInOutput = true;

                if (NubersOfSendedLined > 4)
                {
                    if (!Verbose)
                    {
                        foreach (var item in hiddingLines)
                        {
                            if (sendedData.Contains(item))
                            {
                                showInOutput = false;
                                break;
                            }
                        }
                    }

                    if (sendedData.Contains(StopText))
                    {
                        showInOutput = false;
                        HideNextSendedOutput = true;
                        StopFliProcess();
                    }

                    if (showInOutput)
                    {
                        if (sendedData.StartsWith("| \"", StringComparison.InvariantCulture))
                        {
                            sendedData = sendedData.Substring(3);
                        }

                        if (sendedData.EndsWith("\"", StringComparison.InvariantCulture))
                        {
                            sendedData = sendedData.Substring(0, sendedData.Length - 1);
                        }

                        Console.WriteLine(sendedData);
                    }
                }
            }
        }

        private static void StopFliProcess()
        {
            if (FliProcess != null)
            {
                if (!FliProcess.HasExited)
                {
                    FliProcess.Kill();
                }
            }
        }
    }
}