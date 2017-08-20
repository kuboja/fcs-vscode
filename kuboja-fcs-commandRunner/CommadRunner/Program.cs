using CommandLine;
//using FCS.Core.Grammar.Python;
//using FCS.Core.Runtime;
//using FCS.Core.Scripting;
using System;


namespace Kuboja.Fcs.CommadRunner
{
    internal class Program
    {
        private static Options Options;

        private static void Main(string[] args)
        {
            Options = new Options();
            if (!Parser.Default.ParseArguments(args, Options) && Options.CheckValues().Count > 0)
            {
                Options.CheckValues().ForEach(Console.WriteLine);
                // Display the default usage information
                Console.WriteLine(Options.GetUsage());
                return;
            }

            //string scriptSource = "\r\nmin := 0.5\r\nmax := min+2.0\r\ncutFunction = x => (x<min)?min:((x>max)?max:x)\r\n";
            //Script script = Script.Parse(scriptSource, null);
            //script.Execute();
            //
            //Console.WriteLine((double)Execution.Evaluate(script.Frame, PyParser.ParseExpression("cutFunction(1.0)")));
            //Console.WriteLine((double)Execution.Evaluate(script.Frame, PyParser.ParseExpression("cutFunction(0.0)")));
            //Console.WriteLine((double)Execution.Evaluate(script.Frame, PyParser.ParseExpression("cutFunction(3.0)")));
            //Console.WriteLine((double)Execution.Evaluate(script.Frame, PyParser.ParseExpression("print min")));

          

            
            // Získání příkazu ze zdrojového soubor
            Command command = new Command(Options.FcsFilePath, Options.FcsFileLineNumber);

            if (string.IsNullOrEmpty(command.Variable))
            {
                Console.WriteLine("Chyba: neplatný příkaz!");
                return;
            }

            // Uložit soubor se spouštěcím skriptem
            string runScriptPath = FliProcessManager.CreateAndSaveScriptFile(Options.FcsFilePath, command);

            // Zobrazení aktuálního příkazu
            Console.WriteLine(command.Variable);

            // Spuštění
            FliProcessManager.StartFliProcess(Options.FliPath, new string[] { runScriptPath }, Options.Verbose);
            
            if (Options.Break)
            {
                Console.Write("\nPress any key for exit...");
                Console.ReadKey();
            }
        }
    }
}